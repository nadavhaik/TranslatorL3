class L3Symbol(str):
    def ___eq__(self, other):
        if type(self) == type(other):
            return super().__eq__(other)
        return False


class L3String(str):
    def ___eq__(self, other):
        if type(self) == type(other):
            return super().__eq__(other)
        return False

EMPTY_LIST = L3Symbol("()")
def L3List(*argv):
    val = EMPTY_LIST
    for arg in reversed(argv):
        val = arg, val
    return val


make_ok = lambda val : (L3String("ok") , val) 
make_error = lambda msg : (L3String("error") , msg) 
ok_question_mark = lambda res : (False) if ((issubclass(type(res), tuple) == False)) else ((res[0] == L3String("ok"))) 
error_question_mark = lambda res : (False) if ((issubclass(type(res), tuple) == False)) else ((res[0] == L3String("error"))) 
result_question_mark = lambda res : (ok_question_mark(res) or error_question_mark(res)) 
result__val = lambda res : res[1] 
bind = lambda f : lambda res : (f(result__val(res))) if (ok_question_mark(res)) else (res)  
make_dict = lambda  : L3List(L3String("dictend")) 
empty_question_mark = lambda l : (False) if (issubclass(type(l), tuple)) else ((l == L3Symbol("()"))) 
list_question_mark = lambda l : (True) if (empty_question_mark(l)) else ((list_question_mark(l[1])) if (issubclass(type(l), tuple)) else (False)) 
dict_question_mark = lambda d : (False) if ((not list_question_mark(d))) else ((False) if (empty_question_mark(d)) else (((d[0] == L3String("dictend"))) if ((issubclass(type(d[0]), tuple) == False)) else (dict_question_mark(d[1])))) 
empty_dict_question_mark = lambda dict : (False) if ((not dict_question_mark(dict))) else ((not issubclass(type(dict[0]), tuple))) 
get_rec = lambda dict, k : (make_error(L3String("Key not found"))) if (empty_dict_question_mark(dict)) else ((dict[0][1]) if ((dict[0][0] == k)) else (get_rec(dict[1], k))) 
get = lambda dict, k : (make_error(L3String("Error: not a dictionary"))) if ((not dict_question_mark(dict))) else ((get_rec(dict, k)) if (error_question_mark(get_rec(dict, k))) else (make_ok(get_rec(dict, k)))) 
put_rec = lambda dict, k, v : (L3List(dict[0], (k , v), L3String("dictend"))) if (empty_dict_question_mark(dict[1])) else ((((k , v) , dict[1])) if ((dict[0][0][1] == k)) else ((dict[0] , put_rec(dict[1], k, v)))) 
put = lambda dict, k, v : (make_error(L3String("Error: not a dictionary"))) if ((not dict_question_mark(dict))) else ((make_ok(L3List((k , v), L3String("dictend")))) if (empty_dict_question_mark(dict)) else ((make_ok(((k , v) , dict[1]))) if ((dict[0][0] == k)) else (make_ok(put_rec(dict, k, v))))) 
map_dict_rec = lambda new_dict, old_dict_iter, f : (map_dict_rec(result__val(put(new_dict, old_dict_iter[0][0], f(old_dict_iter[0][1]))), old_dict_iter[1], f)) if (issubclass(type(old_dict_iter[0]), tuple)) else (new_dict) 
map_dict = lambda dict, f : make_ok(map_dict_rec(make_dict(), dict, f)) 
filter_dict_rec = lambda new_dict, old_dict_iter, pred : (new_dict) if (empty_dict_question_mark(old_dict_iter)) else ((filter_dict_rec(result__val(put(new_dict, old_dict_iter[0][0], old_dict_iter[0][1])), old_dict_iter[1], pred)) if (pred(old_dict_iter[0][0], old_dict_iter[0][1])) else (filter_dict_rec(new_dict, old_dict_iter[1], pred))) 
filter_dict = lambda dict, pred : make_ok(filter_dict_rec(make_dict(), dict, pred)) 
