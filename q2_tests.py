import q2
from q2 import *

dict = make_dict()
f = list_question_mark(dict)
f = dict_question_mark(dict)
dict = result__val(put(dict, 1, 2))
dict = result__val(put(result__val(put(make_dict(), 1, True)), 2, False))
list_question_mark(dict)
dict_question_mark(dict)

y = result__val(get(result__val(map_dict(result__val(put(result__val(put(make_dict(), 1, True)), 2, False)), lambda x : (not x) )), 1))
dict = make_dict()
assert False == y
dict = make_dict()
d1 = result__val(put(result__val(put(dict, 3, 4)), 3, 5))
dict = make_dict()

a = result__val(get(result__val(put(result__val(put(dict, 3, 4)), 3, 5)), 3))
x = 0
